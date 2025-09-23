"use client";

import QrClient from "../components/QrClient";
import SwRegister from "../components/SwRegister";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center">
      <div className="container mx-auto p-6">
        <QrClient />
      </div>
      <SwRegister />
    </div>
  );
}
