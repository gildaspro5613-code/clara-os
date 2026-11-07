'use server';
import {cookies} from 'next/headers';
import {readAccountProfile} from '@/lib/auth/account-profile';
/** No browser-supplied identity, token or workspace; no writes or provider calls. */
export async function accountProfile(){
 return readAccountProfile((await cookies()).toString());
}
