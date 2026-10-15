import { readAuthorizedNativeSession, nativeFailure } from "@/lib/native/authority";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  try {
    const session=await readAuthorizedNativeSession(request);
    return Response.json({state:session.state,recommendation:session.recommendation,
      mission:session.mission,brainDashboard:session.brainDashboard,historyOnly:session.historyOnly===true,acquisition:null,
      startedAt:session.startedAt,updatedAt:session.updatedAt}, {headers:{"Cache-Control":"no-store"}});
  } catch(error) { return nativeFailure(error); }
}
