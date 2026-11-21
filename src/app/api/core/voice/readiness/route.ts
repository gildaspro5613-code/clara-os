import {createProductVoiceHandlers} from '@/lib/voice/product-voice';
export const dynamic='force-dynamic';
export const POST=createProductVoiceHandlers().readiness;
