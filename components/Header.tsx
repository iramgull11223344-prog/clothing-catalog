import Link from "next/link";
import { STORE_NAME } from "@/lib/config";

export default function Header({ back }: { back?: string }) {
  return (
    <header className="header">
      <div className="container header-in">
        {back ? (
          <Link href={back} className="back" aria-label="گەڕانەوە">
            →
          </Link>
        ) : null}
        <Link href="/" className="brand">
          {STORE_NAME}
        </Link>
      </div>
    </header>
  );
}
