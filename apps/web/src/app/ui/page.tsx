"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Label,
  Modal,
  Spinner,
} from "@/components/ui";

/* -------------------------------------------------------------------------- */
/* Color reference data                                                       */
/* -------------------------------------------------------------------------- */

const SCALE_SHADES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

const SEMANTIC_SHADES = ["50", "100", "500", "600", "700"] as const;

const FULL_SCALES = [
  { name: "primary", label: "Primary (teal)" },
  { name: "neutral", label: "Neutral (gray)" },
  { name: "accent", label: "Accent (amber)" },
] as const;

const SEMANTIC_SCALES = [
  { name: "success", label: "Success" },
  { name: "warning", label: "Warning" },
  { name: "danger", label: "Danger" },
  { name: "info", label: "Info" },
] as const;

/* -------------------------------------------------------------------------- */
/* Small layout helpers (local to the showcase)                              */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Swatch({ scale, shade }: { scale: string; shade: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="h-12 w-12 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: `rgb(var(--color-${scale}-${shade}))` }}
      />
      <span className="text-[10px] text-muted-foreground">{shade}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function UiShowcasePage() {
  const [dark, setDark] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");

  // Toggle the `.dark` class (and lock out the OS-preference fallback via
  // `.light`) on <html> so every token-driven component re-themes live.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    return () => {
      root.classList.remove("dark", "light");
    };
  }, [dark]);

  const emailInvalid = email.length > 0 && !email.includes("@");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            AreaScan Design System
          </h1>
          <p className="text-sm text-muted-foreground">
            Tokens และ component primitives สำหรับ visual QA
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setDark((d) => !d)}
          aria-pressed={dark}
        >
          {dark ? "☀️ Light mode" : "🌙 Dark mode"}
        </Button>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section title="Color tokens">
        <div className="flex flex-col gap-6">
          {FULL_SCALES.map((s) => (
            <div key={s.name} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {s.label}
              </h3>
              <Row>
                {SCALE_SHADES.map((shade) => (
                  <Swatch key={shade} scale={s.name} shade={shade} />
                ))}
              </Row>
            </div>
          ))}
          {SEMANTIC_SCALES.map((s) => (
            <div key={s.name} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {s.label}
              </h3>
              <Row>
                {SEMANTIC_SHADES.map((shade) => (
                  <Swatch key={shade} scale={s.name} shade={shade} />
                ))}
              </Row>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button loading>Loading</Button>
            <Button variant="secondary" loading>
              Saving…
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </Row>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Badges">
        <Row>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Spinners">
        <Row>
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <span className="text-primary-600">
            <Spinner size="md" aria-hidden />
          </span>
        </Row>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Form fields">
        <div className="grid max-w-md gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" required>
              ชื่อ
            </Label>
            <Input id="name" placeholder="กรอกชื่อของคุณ" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={emailInvalid}
              aria-describedby={emailInvalid ? "email-error" : undefined}
            />
            <FieldError id="email-error">
              {emailInvalid ? "อีเมลไม่ถูกต้อง (ต้องมี @)" : null}
            </FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disabled-field">Disabled</Label>
            <Input id="disabled-field" placeholder="ปิดใช้งาน" disabled />
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>เกาะพีพี</CardTitle>
              <CardDescription>กระบี่, ประเทศไทย</CardDescription>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-foreground">
                น้ำทะเลใสและหน้าผาหินปูนที่สวยงาม เหมาะแก่การดำน้ำดูปะการัง
              </p>
            </CardBody>
            <CardFooter>
              <Badge variant="success">เปิดให้บริการ</Badge>
              <Button size="sm" className="ml-auto">
                ดูรายละเอียด
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ดอยอินทนนท์</CardTitle>
              <CardDescription>เชียงใหม่, ประเทศไทย</CardDescription>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-muted-foreground">
                ยอดเขาที่สูงที่สุดในประเทศไทย อากาศเย็นสบายตลอดทั้งปี
              </p>
            </CardBody>
            <CardFooter>
              <Badge variant="warning">ใกล้เต็ม</Badge>
              <Button size="sm" variant="outline" className="ml-auto">
                ดูรายละเอียด
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Modal / Dialog">
        <Row>
          <Button onClick={() => setModalOpen(true)}>เปิด Modal</Button>
        </Row>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="ยืนยันการจอง"
          description="กรุณาตรวจสอบรายละเอียดก่อนยืนยัน"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={() => setModalOpen(false)}>ยืนยัน</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Dialog นี้รองรับ focus trap, ปิดด้วย ESC หรือคลิกพื้นหลัง และ
              ล็อกการเลื่อนหน้าจอ ลองกด Tab เพื่อทดสอบ focus trap
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modal-input">หมายเหตุ</Label>
              <Input id="modal-input" placeholder="ข้อความถึงเจ้าของที่พัก" />
            </div>
          </div>
        </Modal>
      </Section>
    </main>
  );
}
