import { updateBackofficeUser } from "@/lib/backoffice/users";
import { userMutationContext, userMutationError } from "@/lib/backoffice/user-api";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor, body } = await userMutationContext(request);
    const { id } = await params;
    const user = await updateBackofficeUser(actor, id, body);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    return userMutationError(reason);
  }
}
