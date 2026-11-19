import {calculatePublicQuote,type QuoteRequest} from '@/lib/public-quote';
import {responseError} from '@/lib/catalog-db';
export async function POST(request:Request){try{
 const input=await request.json() as QuoteRequest;
 const {result,giftOptions,addOptions}=await calculatePublicQuote(input);
 return Response.json({quote:result,giftOptions,addOptions},{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof Error&&/selección|producto|regalo|pago|disponible/.test(e.message))return Response.json({error:e.message},{status:400});return responseError(e)}}
