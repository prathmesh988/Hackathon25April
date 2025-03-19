import db from "../../database";

async function signIn(email: string, password: string) {
  const user = await db.query.userTable.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordValid = await Bun.password.verify(
    password,
    user.password,
    "bcrypt",
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export default signIn;
