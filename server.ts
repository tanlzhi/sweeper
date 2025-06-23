import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.192.0/http/file_server.ts";

serve(async (req) => {
  const path = new URL(req.url).pathname;

  // 托管当前目录下的所有文件
  return serveDir(req, {
    fsRoot: ".",  // 当前目录
  });
});