import { ClipboardCheck, RefreshCw, Users } from "lucide-react";
import { Button } from "./Button";

export default {
  title: "Design System/Button",
  component: Button,
  args: {
    children: "검사하기",
    variant: "primary",
    size: "default",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "family", "destructive", "ghost"],
    },
    size: {
      control: "select",
      options: ["default", "large", "icon"],
    },
  },
};

export function Playground(args) {
  return <Button {...args} />;
}

export function SmishingActions() {
  return (
    <div className="grid max-w-xl gap-3 sm:grid-cols-2">
      <Button>
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        검사하기
      </Button>
      <Button variant="secondary">
        <RefreshCw className="h-5 w-5" aria-hidden="true" />
        다시 검사하기
      </Button>
      <Button className="sm:col-span-2" variant="family">
        <Users className="h-5 w-5" aria-hidden="true" />
        가족 확인 문구 만들기
      </Button>
    </div>
  );
}
