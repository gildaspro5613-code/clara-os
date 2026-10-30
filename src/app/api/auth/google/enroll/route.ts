import {NextResponse, type NextRequest} from 'next/server';
import {beginSignInTransaction} from '@/lib/auth/sign-in-transaction';
import {googleSignInAuthorizationUrl} from '@/lib/auth/google-sign-in';
import {enrollmentCookie,enrollmentOrigin,validateEnrollmentTicket} from '@/lib/auth/recette-google-enrollment';

export const dynamic='force-dynamic';
// Capability is submitted in a POST body, never a URL or client-visible cookie.
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==enrollmentOrigin||new URL(request.url).origin!==enrollmentOrigin||
   request.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded'||
   Number(request.headers.get('content-length')??'0')>1024)throw Error('REFUSED');
  const body=await request.text();if(body.length>1024)throw Error('REFUSED');
  const values=new URLSearchParams(body);
  if([...values.keys()].some(k=>k!=='ticket')||values.getAll('ticket').length!==1)throw Error('REFUSED');
  const ticket=values.get('ticket')??'';await validateEnrollmentTicket(ticket);
  const transaction=await beginSignInTransaction('google');
  const response=NextResponse.redirect(googleSignInAuthorizationUrl(transaction.state,transaction.nonce),303);
  response.cookies.set('clara_auth_google_nonce',transaction.nonce,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/google/callback',maxAge:transaction.expiresIn});
  response.cookies.set(enrollmentCookie,ticket,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/google/callback',maxAge:transaction.expiresIn});
  response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch{return NextResponse.json({success:false,code:'RECETTE_ENROLLMENT_REFUSED'},{status:403,headers:{'Cache-Control':'no-store'}});}
}
