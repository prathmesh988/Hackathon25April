import { createFileRoute } from "@tanstack/react-router";
import {
  Tldraw, TLAssetStore, uniqueId, TLBookmarkAsset, AssetRecordType,
  getHashForString
} from "tldraw";
import useWorkspaceStore from "@/store/workspace";
import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { useEffect, useState } from "react";


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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const store = useSync({
    uri: `${WORKER_URL}/connect/${workspace?.id || "default-room-id"}`,
    assets: multiplayerAssets
  });

  useEffect(() => {
    if (workspace?.id) {
      console.log("Connecting to workspace:", workspace.name);
    }
    const handleError = () => {
      setConnectionError("Could not connect to the whiteboard server. Please make sure the server is running.");
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [workspace]);

  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">{connectionError}</p>
          <p className="text-sm text-red-500 mt-2">Make sure the tldraw server is running on port 5858</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tldraw__editor w-[100%] h-[100vh] relative">
      <div className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="text-sm font-medium">Workspace: {workspace?.name || 'Loading...'}</div>
      </div>
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
