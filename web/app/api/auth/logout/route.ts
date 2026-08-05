import { logout } from "../../../admin-auth";
export async function GET(request:Request){await logout();return Response.redirect(new URL("/",request.url));}
