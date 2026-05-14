import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";

export default {
  title: "Design System/Card",
  component: Card,
};

export function ResultCard() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardDescription>위험 가능성</CardDescription>
        <CardTitle className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          주의 66점
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-7 text-slate-700">
          링크 클릭이나 입력 요청은 잠시 멈추세요. 이 결과는 참고용이며, 기존 연락처로 먼저
          확인하는 것이 좋습니다.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">다시 검사하기</Button>
      </CardFooter>
    </Card>
  );
}
