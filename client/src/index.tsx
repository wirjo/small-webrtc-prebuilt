import { ConsoleTemplate, ThemeProvider } from "@pipecat-ai/voice-ui-kit";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

//@ts-ignore - fontsource-variable/geist is not typed
import "@fontsource-variable/geist";
//@ts-ignore - fontsource-variable/geist is not typed
import "@fontsource-variable/geist-mono";

createRoot(document.getElementById("root")!).render(
  // @ts-ignore
  <StrictMode>
    <ThemeProvider>
      <div className="pipecat-ui">
        <ConsoleTemplate
          clientOptions={{
            params: {
              baseUrl: "/api/offer",
            }
          }}
          onConnect={async () => Promise.resolve(new Response())}
          transportType="smallwebrtc"
        />
      </div>
    </ThemeProvider>
  </StrictMode>
);
