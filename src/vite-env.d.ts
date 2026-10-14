/// <reference types="vite/client" />
interface Window {
  __CLINICAL_DEBUG__?:()=>{connection:import('./lib/bridge').Connection;queue:import('./clinical/model').Queue;selected:string|null;view:string;timer:import('./clinical/model').TimerState;route:string;settings:import('./clinical/model').Settings;lab:{stage:string;session:number;remaining:number;hasReport:boolean;hasActivity:boolean;protected:boolean}};
  __TAURI_INTERNALS__?: unknown;
  __ISLAND_DEBUG__?: { snapshot: () => unknown; measure: (ms?: number) => Promise<unknown> };
}
