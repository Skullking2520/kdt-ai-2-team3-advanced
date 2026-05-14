import { Input, Textarea } from "./Input";

export default {
  title: "Design System/Input",
};

export function TextInput() {
  return (
    <div className="max-w-md space-y-2">
      <label className="text-base font-black" htmlFor="sender">
        발신자 메모
      </label>
      <Input id="sender" placeholder="예: 모르는 번호, 택배 문자" />
    </div>
  );
}

export function MessageTextarea() {
  return (
    <div className="max-w-xl space-y-2">
      <label className="text-base font-black" htmlFor="message">
        문자 내용
      </label>
      <Textarea id="message" placeholder="검사할 문자 내용을 입력하세요." />
    </div>
  );
}
