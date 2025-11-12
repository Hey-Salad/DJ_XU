var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-nkkSe7/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.ts
var DEFAULT_MODEL = "deepseek-chat";
var DEFAULT_BASE = "https://api.deepseek.com";
var personaPrimer = `You are DJ XU, a charismatic British-Hong Kong AI DJ who keeps
the energy high, mixes Cantonese cultural references with global club
vibes, and offers concise but animated guidance to listeners. Lean into
music knowledge, highlight track transitions when the context provides a
current song, and keep things friendly and hype.`;
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization"
};
function buildMessages(request) {
  const messages = [
    { role: "system", content: personaPrimer },
    { role: "user", content: request.input }
  ];
  if (request.context) {
    const contextParts = [];
    if (request.context.currentTrack) {
      contextParts.push(`Currently playing: ${request.context.currentTrack}`);
    }
    if (request.context.conversationHistory?.length) {
      contextParts.push(
        `Conversation history:
${request.context.conversationHistory.join("\n")}`
      );
    }
    if (request.context.userPreferences) {
      contextParts.push(
        `User preferences: ${JSON.stringify(request.context.userPreferences)}`
      );
    }
    if (contextParts.length) {
      messages.push({
        role: "system",
        content: contextParts.join("\n")
      });
    }
  }
  return messages;
}
__name(buildMessages, "buildMessages");
async function callDeepSeek(env, request) {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
  const baseUrl = env.DEEPSEEK_API_BASE ?? DEFAULT_BASE;
  const model = env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      max_tokens: 800,
      messages: buildMessages(request)
    })
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `DeepSeek request failed (${response.status}): ${errorBody}`
    );
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "I could not retrieve a response from DeepSeek.";
  return {
    content,
    metadata: {
      source: "deepseek",
      timestamp: Date.now(),
      confidence: data?.choices?.[0]?.confidence
    }
  };
}
__name(callDeepSeek, "callDeepSeek");
function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...init?.headers ?? {}
    }
  });
}
__name(jsonResponse, "jsonResponse");
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
async function callElevenLabs(env, text, voiceId, voiceModel, voiceSettings) {
  const baseUrl = env.ELEVENLABS_API_BASE ?? "https://api.elevenlabs.io/v1";
  const apiKey = env.ELEVENLABS_API_KEY;
  const resolvedVoiceId = voiceId ?? env.ELEVENLABS_VOICE_ID;
  const resolvedModel = voiceModel ?? env.ELEVENLABS_MODEL ?? "eleven_v3";
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required for text-to-speech.");
  }
  if (!resolvedVoiceId) {
    throw new Error("ELEVENLABS_VOICE_ID is required for text-to-speech.");
  }
  const response = await fetch(
    `${baseUrl}/text-to-speech/${resolvedVoiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text,
        model: resolvedModel,
        voice_settings: voiceSettings ?? {}
      })
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs request failed (${response.status}): ${body.slice(0, 1024)}`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") ?? "audio/mpeg";
  return {
    audioBase64: arrayBufferToBase64(arrayBuffer),
    contentType
  };
}
__name(callElevenLabs, "callElevenLabs");
async function startBroadcast(env, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase configuration is missing");
  }
  const { performanceSessionId, maxViewers = 10, captionLanguage = "en", enableTranslations = true } = request;
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/broadcast_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      id: performanceSessionId,
      max_viewers: maxViewers,
      caption_language: captionLanguage,
      enable_translations: enableTranslations,
      status: "live",
      started_at: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create broadcast session: ${error}`);
  }
  const [data] = await response.json();
  const broadcastToken = data.broadcast_token;
  return {
    broadcastId: performanceSessionId,
    broadcastToken,
    shareUrl: `${new URL(env.SUPABASE_URL).origin}/watch/${broadcastToken}`
  };
}
__name(startBroadcast, "startBroadcast");
async function sendCaption(env, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase configuration is missing");
  }
  const { broadcastToken, text, speaker = "DJ_XU", audioUrl, detectedLanguage, confidence } = request;
  const sessionResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}&select=id,status`,
    {
      headers: {
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );
  if (!sessionResponse.ok) {
    throw new Error("Failed to validate broadcast token");
  }
  const sessions = await sessionResponse.json();
  if (!sessions.length || sessions[0].status !== "live") {
    throw new Error("Broadcast is not active");
  }
  const broadcastId = sessions[0].id;
  const countResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/live_captions?broadcast_session_id=eq.${broadcastId}&select=sequence_number&order=sequence_number.desc&limit=1`,
    {
      headers: {
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const lastCaptions = await countResponse.json();
  const sequenceNumber = lastCaptions.length ? lastCaptions[0].sequence_number + 1 : 1;
  const captionResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/live_captions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      broadcast_session_id: broadcastId,
      sequence_number: sequenceNumber,
      speaker,
      original_text: text,
      detected_language: detectedLanguage,
      confidence,
      timestamp_ms: Date.now(),
      audio_url: audioUrl
    })
  });
  if (!captionResponse.ok) {
    const error = await captionResponse.text();
    throw new Error(`Failed to send caption: ${error}`);
  }
  const [caption] = await captionResponse.json();
  return {
    success: true,
    captionId: caption.id
  };
}
__name(sendCaption, "sendCaption");
async function endBroadcast(env, broadcastToken) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase configuration is missing");
  }
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        status: "ended",
        ended_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    }
  );
  if (!response.ok) {
    throw new Error("Failed to end broadcast");
  }
  return { success: true };
}
__name(endBroadcast, "endBroadcast");
async function getBroadcastStatus(env, broadcastToken) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase configuration is missing");
  }
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/rpc/get_broadcast_by_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ token: broadcastToken })
    }
  );
  if (!response.ok) {
    throw new Error("Failed to get broadcast status");
  }
  const data = await response.json();
  return data.length ? data[0] : null;
}
__name(getBroadcastStatus, "getBroadcastStatus");
async function broadcastTrack(env, request) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase configuration is missing");
  }
  const { broadcastToken, track } = request;
  const sessionResponse = await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_sessions?broadcast_token=eq.${broadcastToken}&select=id,status`,
    {
      headers: {
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );
  if (!sessionResponse.ok) {
    throw new Error("Failed to validate broadcast token");
  }
  const sessions = await sessionResponse.json();
  if (!sessions.length || sessions[0].status !== "live") {
    throw new Error("Broadcast is not active");
  }
  const broadcastId = sessions[0].id;
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/broadcast_tracks?broadcast_session_id=eq.${broadcastId}&ended_at=is.null`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        ended_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    }
  );
  const trackResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/broadcast_tracks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      broadcast_session_id: broadcastId,
      track_name: track.name,
      artist: track.artist,
      album: track.album,
      album_art_url: track.albumArtUrl,
      source: "spotify",
      source_track_id: track.id
    })
  });
  if (!trackResponse.ok) {
    const error = await trackResponse.text();
    throw new Error(`Failed to broadcast track: ${error}`);
  }
  const [trackData] = await trackResponse.json();
  return {
    success: true,
    trackId: trackData.id
  };
}
__name(broadcastTrack, "broadcastTrack");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (url.pathname === "/api/deepseek") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const payload = await request.json();
        const aiResponse = await callDeepSeek(env, payload);
        return jsonResponse(aiResponse);
      } catch (error) {
        console.error("DeepSeek worker error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/ai") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const payload = await request.json();
        const aiResponse = await callDeepSeek(env, payload);
        const ttsResponse = await callElevenLabs(
          env,
          aiResponse.content,
          payload.voiceId,
          payload.voiceModel,
          payload.voiceSettings
        );
        return jsonResponse({
          deepseek: aiResponse,
          audio: {
            base64: ttsResponse.audioBase64,
            contentType: ttsResponse.contentType
          }
        });
      } catch (error) {
        console.error("Chained AI worker error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/broadcast/start") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const payload = await request.json();
        const result = await startBroadcast(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error("Start broadcast error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/broadcast/caption") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const payload = await request.json();
        const result = await sendCaption(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error("Send caption error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/broadcast/end") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const { broadcastToken } = await request.json();
        const result = await endBroadcast(env, broadcastToken);
        return jsonResponse(result);
      } catch (error) {
        console.error("End broadcast error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/broadcast/status") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const { broadcastToken } = await request.json();
        const result = await getBroadcastStatus(env, broadcastToken);
        if (!result) {
          return jsonResponse({ error: "Broadcast not found" }, { status: 404 });
        }
        return jsonResponse(result);
      } catch (error) {
        console.error("Get broadcast status error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/broadcast/track") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, { status: 405 });
      }
      try {
        const payload = await request.json();
        const result = await broadcastTrack(env, payload);
        return jsonResponse(result);
      } catch (error) {
        console.error("Broadcast track error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return jsonResponse({ error: message }, { status: 500 });
      }
    }
    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nkkSe7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nkkSe7/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
