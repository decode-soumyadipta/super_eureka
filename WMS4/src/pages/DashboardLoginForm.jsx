"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./DashboardLogin.module.css";
import { authService } from "../services/authService.js";

export const DashboardLoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    department: "",
    phone: ""
  });

  const navigate = useNavigate();

  // Fetch departments when component mounts or when switching to registration
  useEffect(() => {
    if (!isLogin) {
      fetchDepartments();
    }
  }, [isLogin]);

  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/departments');
      const data = await response.json();

      if (data.success && data.data.departments) {
        setDepartments(data.data.departments);
      } else {
        toast.error("Failed to load departments");
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error("Error loading departments");
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await authService.login({
          email: formData.email,
          password: formData.password
        });

        if (response.success) {
          toast.success("Login successful!");
          const user = response.data.user;

          // Navigate based on user role
          setTimeout(() => {
            if (user.role === 'admin') {
              navigate("/admin");
            } else {
              navigate("/HOD");
            }
          }, 1500);
        }
      } else {
        // Registration
        const response = await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          department: formData.department,
          phone: formData.phone
        });

        if (response.success) {
          toast.success("Registration successful! You can now login.");
          setIsLogin(true);
          setFormData({
            email: formData.email, // Keep email for convenience
            password: "",
            name: "",
            department: "",
            phone: ""
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error.message || error.errors?.[0]?.msg || "Authentication failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: "",
      password: "",
      name: "",
      department: "",
      phone: ""
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.div2}>
        <h2 className="text-2xl font-bold text-primary-800 mb-6 text-center">
          {isLogin ? "Login to Dashboard" : "Register Account"}
        </h2>

        {/* Name field for registration */}
        {!isLogin && (
          <div className={styles.rectangle}>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              className={styles.username}
              required
            />
          </div>
        )}

        {/* Email field */}
        <div className={styles.rectangle}>
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/57504037d7e6b3838ed793dd36d04799dd38f02f8e5105ccabc9e9c37e72edb4?placeholderIfAbsent=true&apiKey=d6718ae395eb4fa2ad8eb48d9f757a9a"
            className={styles.img2}
            alt="Email icon"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email Address"
            className={styles.username}
            required
          />
        </div>

        {/* Password field */}
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
            minLength={4}
          />
        </div>

        {/* Simple password requirement for registration */}
        {!isLogin && (
          <div className="text-sm text-gray-300 mb-4 px-2">
            <p>Password must be at least 4 characters long</p>
          </div>
        )}

        {/* Department field for registration */}
        {!isLogin && (
          <div className={styles.rectangle}>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className={styles.username}
              required
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading ? "Loading departments..." : "Select Department"}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Phone field for registration */}
        {!isLogin && (
          <div className={styles.rectangle}>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone Number (Optional)"
              className={styles.username}
            />
          </div>
        )}

        <button
          type="submit"
          className={styles.rectangle3}
          disabled={isLoading}
        >
          {isLoading ? "Please wait..." : (isLogin ? "Login" : "Register")}
        </button>

        {/* Toggle between login and registration */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-primary-600 hover:text-primary-800 underline"
          >
            {isLogin ? "Need an account? Register here" : "Already have an account? Login here"}
          </button>
        </div>
      </form>
      <ToastContainer />
    </>
  );
};