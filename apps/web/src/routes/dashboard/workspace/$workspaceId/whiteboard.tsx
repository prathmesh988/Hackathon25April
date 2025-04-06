import { createFileRoute } from "@tanstack/react-router";
import {
  Tldraw, TLAssetStore, uniqueId, TLBookmarkAsset, AssetRecordType,
  getHashForString
} from "tldraw";
import useWorkspaceStore from "@/store/workspace";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { useEffect } from "react";


export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/whiteboard"
)({
  component: RouteComponent,
});

const WORKER_URL = "http://localhost:5858"

const multiplayerAssets: TLAssetStore = {
  // to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
  async upload(_asset, file): Promise<any> {
    const id = uniqueId()

    const objectName = `${id}-${file.name}`
    const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

    const response = await fetch(url, {
      method: 'PUT',
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`)
    }

    return url
  },
  // to retrieve an asset, we can just use the same URL. you could customize this to add extra
  // auth, or to serve optimized versions / sizes of the asset.
  resolve(asset) {
    return asset.props.src
  },
}

// How does our server handle bookmark unfurling?
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: 'asset',
    type: 'bookmark',
    meta: {},
    props: {
      src: url,
      description: '',
      image: '',
      favicon: '',
      title: '',
    },
  }

  try {
    const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
    const data = await response.json()

    asset.props.description = data?.description ?? ''
    asset.props.image = data?.image ?? ''
    asset.props.favicon = data?.favicon ?? ''
    asset.props.title = data?.title ?? ''
  } catch (e) {
    console.error(e)
  }

  return asset
}


function RouteComponent() {
  const { workspace } = useWorkspaceStore();
  const store = useSync({
    uri: `${WORKER_URL}/connect/${workspace?.id || "default-room-id"}`,
    assets: multiplayerAssets
  });

  useEffect(() => {
    console.log(workspace?.id);
  }, [workspace]);

  return (
    <div className="tldraw__editor w-[100%] h-[100vh] relative">
      <Tldraw 
        store={store}
        onMount={(editor) => {
          // @ts-expect-error
          window.editor = editor;
          editor.registerExternalAssetHandler('url', unfurlBookmarkUrl);
        }}
      />
    </div>
  );
}
