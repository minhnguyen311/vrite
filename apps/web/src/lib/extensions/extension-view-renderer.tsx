import { ComponentRenderer } from "./component-renderer";
import { ContextFunctions, SerializedContext, UsableEnvData } from "./sandbox";
import { ContextObject, ExtensionBaseViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount,
  Setter,
  Show,
  useContext
} from "solid-js";
import { mdiAlertCircle } from "@mdi/js";
import { nanoid } from "nanoid";
import { ExtensionDetails } from "#context";
import { Icon, Loader } from "#components/primitives";

type ExtensionViewRendererProps<O> = {
  extension: ExtensionDetails;
  contentEditable?: boolean;
  view?: ExtensionElement;
  viewId?: string;
  uid?: string;
  onInitiated?(view: ExtensionElement, uid: string): void;
} & O;

interface ExtensionViewContextData {
  extension: ExtensionDetails;
  envData: Accessor<ContextObject>;
  setEnvData: Setter<ContextObject>;
}

const registeredEffects = new Set<string>();
const ExtensionViewContext = createContext<ExtensionViewContextData>();
const ExtensionViewRenderer = <C extends ExtensionBaseViewContext>(
  props: ExtensionViewRendererProps<{
    ctx: SerializedContext<C>;
    func: ContextFunctions<C>;
    usableEnvData: UsableEnvData<C>;
    components?: Record<string, Component<any>>;
    uid?: string;
    onUsableEnvDataUpdate?(usableEnvData: UsableEnvData<C>): void;
  }>
): JSX.Element => {
  const [initiated, setInitiated] = createSignal(false);
  const { sandbox } = props.extension;
  const uid = props.uid || nanoid();
  const viewId = props.viewId || "";
  const uidEnvData = createMemo(() => {
    return sandbox!.envData()[uid] as ContextObject;
  });

  let error: Error | null = null;
  let view: ExtensionElement | null = props.view || null;

  if (!registeredEffects.has(uid)) {
    createEffect(
      on(
        () => props.usableEnvData,
        (usableEnvData) => {
          sandbox?.setEnvData((envData) => {
            return {
              ...envData,
              [uid]: {
                ...(typeof envData[uid] === "object" ? (envData[uid] as ContextObject) : {}),
                ...usableEnvData
              }
            };
          });
        }
      )
    );
    createEffect(
      on(uidEnvData, (value) => {
        props.onUsableEnvDataUpdate?.({
          ...props.usableEnvData,
          ...value
        });
      })
    );
    registeredEffects.add(uid);
  }

  onMount(() => {
    if (!view && viewId && sandbox && props.extension.id && props.extension.token) {
      sandbox
        .generateView<C>(viewId, props.ctx, props.func, uid)
        .then((generatedViewData) => {
          view = generatedViewData?.view || null;
          setInitiated(true);

          if (generatedViewData?.view) {
            props.onInitiated?.(generatedViewData.view, uid);
          }
        })
        .catch((caughtError) => {
          error = caughtError;
          // eslint-disable-next-line no-console
          console.error(error);
          setInitiated(true);
        });
    } else if (view) {
      setInitiated(true);
      props.onInitiated?.(view, uid);
    } else {
      error = new Error("No view or viewId");
      // eslint-disable-next-line no-console
      console.error(error);
      setInitiated(true);
    }
  });
  onCleanup(() => {
    registeredEffects.delete(uid);
    sandbox?.removeScope(`view:${uid}`);
  });

  return (
    <ExtensionViewContext.Provider
      value={{
        extension: props.extension,
        envData: sandbox!.envData,
        setEnvData: sandbox!.setEnvData
      }}
    >
      <Show
        when={initiated() && view && !error}
        fallback={
          <div class="h-full w-full flex justify-center items-center">
            <Show when={initiated() && error} fallback={<Loader />}>
              <div class=" text-gray-500 dark:text-gray-400 flex gap-1 justify-center items-center">
                <Icon path={mdiAlertCircle} class="h-5 w-5" />
                <span>Couldn't load the view</span>
              </div>
            </Show>
          </div>
        }
      >
        <ComponentRenderer
          spec={props.extension.spec}
          contentEditable={props.contentEditable}
          components={props.components}
          view={view!}
        />
      </Show>
    </ExtensionViewContext.Provider>
  );
};
const useViewContext = (): ExtensionViewContextData => {
  return useContext(ExtensionViewContext)!;
};

export { ExtensionViewRenderer, useViewContext };
