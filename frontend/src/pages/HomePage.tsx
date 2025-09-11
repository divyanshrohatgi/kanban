import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { PlusCircle, LayoutGrid, Zap } from "lucide-react";

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600/20 via-fuchsia-500/10 to-cyan-500/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
              Move work forward, together
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Real-time collaborative Kanban boards with presence, notifications, and smooth drag & drop.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/boards">
                <Button size="lg" className="gap-2">
                  <LayoutGrid className="w-5 h-5" /> Go to Boards
                </Button>
              </Link>
              <Link to="/boards">
                <Button size="lg" variant="outline" className="gap-2">
                  <PlusCircle className="w-5 h-5" /> New Board
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-foreground">Real-time collaboration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                See updates instantly across tabs with sockets: presence, live moves, and notifications.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-foreground">Smooth drag & drop</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Optimistic moves with soft animations and conflict-safe reconciliation.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-foreground">Fast task creation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Quick add with optional priority, assignee, and due date when you need them.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
