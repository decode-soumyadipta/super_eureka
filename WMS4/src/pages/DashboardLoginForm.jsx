"use client";
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./DashboardLogin.module.css";

export const DashboardLoginForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.username === "abid" && formData.password === "abid") {
      toast.success("Login successful!");
      setTimeout(() => {
        navigate("/admin");
      }, 2000); // Delay navigation to allow the toast to be visible
    }  else if (formData.username === "abin" && formData.password === "abin") {
      toast.success("Login successful!");
      setTimeout(() => {
        window.location.href = "http://localhost:5174/";
      }, 2000); // Delay navigation to allow the toast to be visible
    } else {
      toast.error("Invalid username or password");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.div2}>
        <div className={styles.rectangle}>
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/57504037d7e6b3838ed793dd36d04799dd38f02f8e5105ccabc9e9c37e72edb4?placeholderIfAbsent=true&apiKey=d6718ae395eb4fa2ad8eb48d9f757a9a"
            className={styles.img2}
            alt="Username icon"
          />
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Username"
            className={styles.username}
            required
          />
        </div>
        <div className={styles.rectangle2}>
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/47e1946ab5690657a70c7581182fa78d733a9e0928efd9d0c229f2aaa93d4f82?placeholderIfAbsent=true&apiKey=d6718ae395eb4fa2ad8eb48d9f757a9a"
            className={styles.img3}
            alt="Password icon"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Password"
            className={styles.password}
            required
          />
        </div>
        <button type="submit" className={styles.rectangle3}>
          login
        </button>
      </form>
      <ToastContainer />
    </>
  );
};