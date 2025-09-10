import {
  ConsoleTemplate,
  FullScreenContainer,
  ThemeProvider,
} from "@pipecat-ai/voice-ui-kit";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

//@ts-ignore - fontsource-variable/geist is not typed
import "@fontsource-variable/geist";
//@ts-ignore - fontsource-variable/geist is not typed
import "@fontsource-variable/geist-mono";

function App() {
  const [connectionUrl, setConnectionUrl] = useState("http://52.23.198.122/api/offer");

  return (
    <ThemeProvider>
      <FullScreenContainer>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
          <input
            type="text"
            value={connectionUrl}
            onChange={(e) => setConnectionUrl(e.target.value)}
            placeholder="Connection URL"
            style={{ padding: '4px 8px', fontSize: '12px', width: '200px' }}
          />
        </div>
        <ConsoleTemplate
          connectParams={{ connectionUrl }}
          transportType="smallwebrtc"
        />
      </FullScreenContainer>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
