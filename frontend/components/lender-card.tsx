"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LenderCardProps {
  name: string;
  interestRate: number;
  reason: string;
}

export function LenderCard({ name, interestRate, reason }: LenderCardProps) {
  return (
    <Card className="w-full bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{name}</h3>
          <div className="text-right">
            <span className="text-lg font-bold text-primary">{interestRate}%</span>
            <div className="text-xs text-muted-foreground">Interest Rate</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </CardContent>
    </Card>
  );
}
