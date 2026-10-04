// Named and slots confirmed by in-game Announcement 901 (2026-09-30).
export const octoberEquipment=[
 {id:'equipment-pc-50601',kind:'equipment',name:'スイートスケアリー',slot:'武器'},
 {id:'equipment-pc-50602',kind:'equipment',name:'ナイトメアロッド',slot:'武器'},
 {id:'equipment-pc-50603',kind:'equipment',name:'紅月のイヤーカフ',slot:'装飾'},
].map(r=>({...r,note:'「屍の姫に扮して」イベント武具。専用ショップで設計図を入手し、鍛冶屋で製作。2026年9月30日登場（10月開催イベント）。',source:{sheet:'PC版 Announcement 901 / Equipment',row:Number(r.id.split('-').at(-1))}}));
