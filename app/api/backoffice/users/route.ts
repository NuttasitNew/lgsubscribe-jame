import { createBackofficeUser } from "@/lib/backoffice/users";
import { userMutationContext, userMutationError } from "@/lib/backoffice/user-api";
export async function POST(request: Request) {
  try {
    const { actor, body } = await userMutationContext(request);
    const user = await createBackofficeUser(actor, body);
    return Response.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    return userMutationError(reason);
  }
}
