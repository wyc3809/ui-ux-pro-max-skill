// The slice of the Deno runtime the Edge Function entry points use, so `tsc -p supabase/functions` can check
// them without Deno installed. The real types come from the Supabase Edge Runtime at deploy time.
declare namespace Deno {
  const env: { get(key: string): string | undefined };
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown;
}

declare module "npm:fflate@0.8.2" {
  export function unzipSync(data: Uint8Array): Record<string, Uint8Array>;
}
