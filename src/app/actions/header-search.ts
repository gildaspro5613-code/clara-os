'use server';
import {cookies} from 'next/headers';
import {readNativeSearch} from '@/lib/native/search-view';
export async function headerSearch(text:string){
 return readNativeSearch(new Request('https://native-selector.invalid',{headers:{cookie:(await cookies()).toString()}}),text);
}
