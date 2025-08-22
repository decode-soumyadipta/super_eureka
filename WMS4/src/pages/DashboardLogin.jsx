"use client";
import * as React from "react";
import styles from "./DashboardLogin.module.css";
import { DashboardLoginForm } from "./DashboardLoginForm";

const DashboardLogin = () => {
  return (
    <main className={styles.dashboardLogin}>
      {/* Logo image placeholder above the login form */}
      <div className={styles.logoWrapper}>
        <img
          src="/path/to/logo.png" // Update this path later
          alt="Logo"
          className={styles.logoImg}
        />
      </div>
      <div className={styles.div}>
        <DashboardLoginForm />
      </div>
    </main>
  );
};

export default DashboardLogin;