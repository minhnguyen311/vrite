import { SidePanel } from "./side-panel";
import { Toolbar } from "./toolbar";
import { SidebarMenu } from "./sidebar-menu";
import { BottomMenu } from "./bottom-menu";
import { SidePanelRight } from "./side-panel-right";
import { WalkthroughProvider } from "./walkthrough";
import { ParentComponent, Show, createEffect } from "solid-js";
import { useLocation } from "@solidjs/router";
import { mdiFullscreenExit } from "@mdi/js";
import clsx from "clsx";
import posthog from "posthog-js";
import {
  AppearanceProvider,
  AuthenticatedUserDataProvider,
  ExtensionsProvider,
  CommandPaletteProvider,
  ContentDataProvider,
  useLocalStorage,
  useHostConfig
} from "#context";
import { IconButton, Tooltip } from "#components/primitives";
import { SubscriptionBanner } from "#ee";

const SecuredLayout: ParentComponent = (props) => {
  const { storage, setStorage } = useLocalStorage();
  const hostConfig = useHostConfig();
  const location = useLocation();

  if (import.meta.env.PROD && hostConfig.analytics) {
    posthog.init("phc_m9JcBa51gXCkGdLFtqeMZXFfJkuSTg8C9iDMun0sZgg", {
      api_host: "https://app.posthog.com"
    });
  }

  createEffect(() => {
    if (location.pathname !== "/editor") {
      setStorage((storage) => ({ ...storage, zenMode: false }));
    }
  });

  return (
    <AuthenticatedUserDataProvider>
      <AppearanceProvider>
        <ExtensionsProvider>
          <ContentDataProvider>
            <CommandPaletteProvider>
              <WalkthroughProvider>
                <div class="flex flex-col h-full w-full">
                  <Show when={hostConfig.billing}>
                    <SubscriptionBanner />
                  </Show>
                  <div
                    class={clsx(
                      "flex-1 flex flex-col-reverse md:flex-row h-[calc(100%-1.5rem)]",
                      !storage().zenMode && "md:border-b-2 border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <Show
                      when={!storage().zenMode}
                      fallback={
                        <Tooltip
                          wrapperClass="fixed top-0 right-0 z-50 mt-2 md:mt-4 mr-4 md:mr-6"
                          class="-ml-1"
                          text="Exit Zen mode"
                          side="left"
                        >
                          <IconButton
                            path={mdiFullscreenExit}
                            class="m-0"
                            text="soft"
                            onClick={() => {
                              setStorage((storage) => ({ ...storage, zenMode: false }));
                            }}
                          />
                        </Tooltip>
                      }
                    >
                      <SidebarMenu />
                    </Show>
                    <div
                      class="flex flex-col flex-1 md:h-full overflow-visible"
                      id="main-scrollable-container"
                    >
                      <div class="flex flex-1 h-full">
                        <Show when={!storage().zenMode}>
                          <SidePanel />
                        </Show>
                        <div class="flex-1 relative flex flex-col w-full">
                          <Show when={!storage().zenMode}>
                            <Toolbar />
                          </Show>
                          <div
                            class={clsx(
                              "absolute w-full",
                              storage().zenMode ? "top-0 h-full" : "h-[calc(100%-3rem)] top-12"
                            )}
                          >
                            {props.children}
                          </div>
                        </div>
                        <Show when={!storage().zenMode}>
                          <SidePanelRight />
                        </Show>
                      </div>
                    </div>
                  </div>
                  <Show when={!storage().zenMode}>
                    <BottomMenu />
                  </Show>
                </div>
              </WalkthroughProvider>
            </CommandPaletteProvider>
          </ContentDataProvider>
        </ExtensionsProvider>
      </AppearanceProvider>
    </AuthenticatedUserDataProvider>
  );
};

export { SecuredLayout };
