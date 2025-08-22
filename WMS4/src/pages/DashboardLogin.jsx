"use client";
import * as React from "react";
import styles from "./DashboardLogin.module.css";
import { DashboardLoginForm } from "./DashboardLoginForm";

const DashboardLogin = () => {
  return (
    <main className={styles.dashboardLogin}>
      {/* Logo and brand section */}
      <div className={styles.logoWrapper}>
        <img
          src="/logo.png"
          alt="e-Shunya Logo"
          className={styles.logoImg}
        />
        <div className={styles.brandText}>
          <h1 className={styles.brandName}>e-Shunya</h1>
        </div>
      </div>
      <div className={styles.div}>
        <DashboardLoginForm />
      </div>
    </main>
  );
};

export default DashboardLogin;