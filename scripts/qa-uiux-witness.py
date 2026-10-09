"""Owned synthetic background window. All clicks are performed by the computer tool."""
from pathlib import Path
import datetime, json, tkinter as tk
out=Path(__file__).resolve().parent.parent/'evidence/uiux-continuation-20261008'
root=tk.Tk();root.title('UIUX continuation synthetic background')
root.geometry('900x590+510+0');root.configure(bg='#dbe5e8')
events=[]
label=tk.Label(root,text='Synthetic QA background\nClicks received: 0',bg='#dbe5e8',fg='#172c2d',font=('Segoe UI',18))
label.pack(pady=220)
def click(event):
    events.append(dict(at=datetime.datetime.now().astimezone().isoformat(),x=event.x_root,y=event.y_root))
    label.configure(text=f'Synthetic QA background\nClicks received: {len(events)}')
root.bind('<ButtonRelease-1>',click)
root.after(180000,root.destroy)
try:root.mainloop()
finally:(out/'witness-clicks.json').write_text(json.dumps(dict(clicks=events),indent=2),encoding='utf8')
