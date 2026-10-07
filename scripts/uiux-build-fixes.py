from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/clinical/ClinicalIsland.tsx';s=p.read_text(encoding='utf8').replace(',WifiOff,Settings2}',',WifiOff}').replace("import T from './tokens.json';\n",'');p.write_text(s,encoding='utf8')
p=root/'src-tauri/src/clinical_window.rs';s=p.read_text(encoding='utf8').replace('v[0]<-','v[0]< -').replace('v[1]<-','v[1]< -');p.write_text(s,encoding='utf8')
p=root/'src/clinical/useClinicalLayout.ts';s=p.read_text(encoding='utf8').replace("ease:'power2.out',clearProps:'filter,transform'", "ease:reduced?'none':'power2.out',clearProps:'filter,transform'")
p.write_text(s,encoding='utf8')
print('TypeScript unused imports and Rust comparison spacing corrected')
