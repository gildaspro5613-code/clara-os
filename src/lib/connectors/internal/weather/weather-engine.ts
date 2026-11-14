import {assertRecetteExternalExecutionBlocked} from '@/lib/recette/external-execution-guard';
import type {WeatherContext} from './weather-context';
import type {WeatherResult} from './weather-result';
const WEATHER_API_BASE_URL='https://api.weatherapi.com/v1';
export class WeatherEngine {
 public async read(context:WeatherContext):Promise<WeatherResult>{
  assertRecetteExternalExecutionBlocked('weather.read');
  const failed=(code:string):WeatherResult=>({success:false,location:context.location,code,message:'Weather unavailable.',completedAt:new Date()});
  const key=process.env.WEATHER_API_KEY;
  if(!key?.trim())return failed('WEATHER_CONFIGURATION_MISSING');
  try{
   const url=new URL(WEATHER_API_BASE_URL+'/current.json');url.searchParams.set('key',key);url.searchParams.set('q',context.location);
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return failed(response.status===401||response.status===403?'WEATHER_PROVIDER_REFUSED':'WEATHER_PROVIDER_UNAVAILABLE');
   const data=await response.json();
   const temperature=data?.current?.temp_c,condition=data?.current?.condition?.text,location=data?.location?.name;
   const updatedAt=typeof data?.current?.last_updated_epoch==='number'?new Date(data.current.last_updated_epoch*1000):new Date(data?.current?.last_updated??'');
   if(typeof temperature!=='number'||!Number.isFinite(temperature)||typeof condition!=='string'||!condition.trim()||typeof location!=='string'||!location.trim()||!Number.isFinite(updatedAt.getTime()))return failed('WEATHER_INVALID_RESPONSE');
   const icon=data?.current?.condition?.icon;
   return {success:true,location,country:typeof data.location.country==='string'?data.location.country:undefined,temperatureC:temperature,condition,icon:typeof icon==='string'&&/^\/\/cdn\.weatherapi\.com\//.test(icon)?icon:undefined,updatedAt,completedAt:new Date()};
  }catch{return failed('WEATHER_PROVIDER_UNAVAILABLE');} // Never expose URL/key/provider exceptions.
 }
}
