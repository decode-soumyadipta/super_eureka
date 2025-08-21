"use client";
import * as React from "react";
import styles from "./DashboardLogin.module.css";
import { DashboardLoginForm } from "./DashboardLoginForm";

const DashboardLogin = () => {
  return (
    <main className={styles.dashboardLogin}>
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/TEMP/45287dc5ed4e095aae98880c4564ff55fbfeb61f32f620f0f424518f1437958d?placeholderIfAbsent=true&apiKey=d6718ae395eb4fa2ad8eb48d9f757a9a"
        className={styles.img}
        alt="Background"
      />
      <div className={styles.div}>
        <DashboardLoginForm />
      </div>
    </main>
  );
};

export default DashboardLogin;