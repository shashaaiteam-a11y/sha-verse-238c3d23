// 🧪 ULTRA SIMPLE TEST AD - No hooks, no logic, just renders
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TestAdSimpleProps {
  placement?: string;
}

export const TestAdSimple = ({ placement = "test" }: TestAdSimpleProps) => {
  console.log(`[TestAdSimple ${placement}] RENDERING - this should always show!`);
  
  return (
    <Card className="p-4 border-2 border-red-500 bg-yellow-100">
      <div className="text-center">
        <p className="font-bold text-red-600 text-lg">🧪 TEST AD</p>
        <p className="text-sm text-gray-700">Placement: {placement}</p>
        <p className="text-xs text-gray-500 mt-2">If you see this, ads CAN render!</p>
        <Button size="sm" className="mt-2 bg-blue-500 text-white">
          Test CTA
        </Button>
      </div>
    </Card>
  );
};

export default TestAdSimple;
