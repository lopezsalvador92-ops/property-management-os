import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.publicMetadata as { role?: string })?.role;

  if (role === "admin") {
    redirect("/admin");
  } else if (role === "owner") {
    redirect("/owner");
  } else {
    // Default: send to admin if no role set
    redirect("/admin");
  }
}