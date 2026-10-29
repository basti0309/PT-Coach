import { redirect } from "next/navigation";

// Fragebogen und Profil sind zusammengelegt; alte Links führen aufs Profil.
export default function KundeFragebogen() {
  redirect("/kunde/profil");
}
