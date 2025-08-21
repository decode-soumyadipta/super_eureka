import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const initialUserData = [
    { id: 1, name: "John Repairs", email: "johnrepairs@example.com", phone: "123-456-7890", role: "Repair Center", status: "Active", gmaps: "https://maps.google.com/?q=John+Repairs" },
    { id: 2, name: "Jack Repairs", email: "jackrepairs@example.com", phone: "234-567-8901", role: "Repair Center", status: "Active", gmaps: "https://maps.google.com/?q=Jack+Repairs" },
    { id: 3, name: "Brave Repairs", email: "braverepairs@example.com", phone: "345-678-9012", role: "Repair Center", status: "Inactive", gmaps: "https://maps.google.com/?q=Brave+Repairs" },
    { id: 4, name: "Awesome Repairs", email: "awesomerepairs@example.com", phone: "456-789-0123", role: "Repair Center", status: "Active", gmaps: "https://maps.google.com/?q=Awesome+Repairs" },
    { id: 5, name: "Cofee Repairs", email: "cofeerepairs@example.com", phone: "567-890-1234", role: "Repair Center", status: "Active", gmaps: "https://maps.google.com/?q=Cofee+Repairs" },
];

const UsersTable = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState(initialUserData);
    const [userData, setUserData] = useState(initialUserData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        phone: "",
        role: "",
        status: "Active",
        gmaps: "",
    });

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        const filtered = userData.filter(
            (user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
        );
        setFilteredUsers(filtered);
    };

    const handleEmailClick = (email) => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank');
    };

    const handleCallClick = (phone) => {
        alert(`Call: ${phone}`);
    };

    const handleGMapsClick = (gmaps) => {
        window.open(gmaps, '_blank');
    };

    const handleAddUser = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setNewUser({
            name: "",
            email: "",
            phone: "",
            role: "",
            status: "Active",
            gmaps: "",
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmitNewUser = () => {
        const updatedUserData = [...userData, { ...newUser, id: userData.length + 1 }];
        setUserData(updatedUserData);
        setFilteredUsers(updatedUserData);
        handleModalClose();
    };

    const handleRemoveUser = (id) => {
        const updatedUserData = userData.filter(user => user.id !== id);
        setUserData(updatedUserData);
        setFilteredUsers(updatedUserData);
    };

    return (
        <motion.div
            className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <div className='flex justify-between items-center mb-6'>
                <h2 className='text-xl font-semibold text-gray-100'>Repair Center</h2>
                <div className='relative'>
                    <input
                        type='text'
                        placeholder='Search users...'
                        className='bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
                </div>
                <button
                    className='ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400'
                    onClick={handleAddUser}
                >
                    Add User
                </button>
            </div>

            <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-700'>
                    <thead>
                        <tr>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                Name
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                Email
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                Role
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                Status
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                Actions
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                GMaps
                            </th>
                        </tr>
                    </thead>

                    <tbody className='divide-y divide-gray-700'>
                        {filteredUsers.map((user) => (
                            <motion.tr
                                key={user.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <td className='px-6 py-4 whitespace-nowrap'>
                                    <div className='flex items-center'>
                                        <div className='flex-shrink-0 h-10 w-10'>
                                            <div className='h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold'>
                                                {user.name.charAt(0)}
                                            </div>
                                        </div>
                                        <div className='ml-4'>
                                            <div className='text-sm font-medium text-gray-100'>{user.name}</div>
                                        </div>
                                    </div>
                                </td>

                                <td className='px-6 py-4 whitespace-nowrap'>
                                    <div className='text-sm text-gray-300'>{user.email}</div>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                    <span className='px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-800 text-blue-100'>
                                        {user.role}
                                    </span>
                                </td>

                                <td className='px-6 py-4 whitespace-nowrap'>
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.status === "Active"
                                                ? "bg-green-800 text-green-100"
                                                : "bg-red-800 text-red-100"
                                        }`}
                                    >
                                        {user.status}
                                    </span>
                                </td>

                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                                    <button
                                        className='text-indigo-400 hover:text-indigo-300 mr-2'
                                        onClick={() => handleCallClick(user.phone)}
                                    >
                                        Call
                                    </button>
                                    <button
                                        className='text-red-400 hover:text-red-300 mr-2'
                                        onClick={() => handleEmailClick(user.email)}
                                    >
                                        Email
                                    </button>
                                    <button
                                        className='text-red-600 hover:text-red-500'
                                        onClick={() => handleRemoveUser(user.id)}
                                    >
                                        Remove
                                    </button>
                                </td>

                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                                    <button
                                        className='text-green-400 hover:text-green-300'
                                        onClick={() => handleGMapsClick(user.gmaps)}
                                    >
                                        GMaps
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50'>
                    <div className='bg-white p-6 rounded-lg'>
                        <h2 className='text-xl font-semibold mb-4'>Add New User</h2>
                        <div className='mb-4'>
                            <label className='block text-gray-700'>Name</label>
                            <input
                                type='text'
                                name='name'
                                value={newUser.name}
                                onChange={handleInputChange}
                                className='w-full px-3 py-2 border rounded-lg text-black'
                            />
                        </div>
                        <div className='mb-4'>
                            <label className='block text-gray-700'>Email</label>
                            <input
                                type='email'
                                name='email'
                                value={newUser.email}
                                onChange={handleInputChange}
                                className='w-full px-3 py-2 border rounded-lg text-black'
                            />
                        </div>
                        <div className='mb-4'>
                            <label className='block text-gray-700'>Phone</label>
                            <input
                                type='text'
                                name='phone'
                                value={newUser.phone}
                                onChange={handleInputChange}
                                className='w-full px-3 py-2 border rounded-lg text-black'
                            />
                        </div>
                        <div className='mb-4'>
                            <label className='block text-gray-700'>Role</label>
                            <input
                                type='text'
                                name='role'
                                value={newUser.role}
                                onChange={handleInputChange}
                                className='w-full px-3 py-2 border rounded-lg text-black'
                            />
                        </div>
                        <div className='mb-4'>
                            <label className='block text-gray-700'>GMaps URL</label>
                            <input
                                type='text'
                                name='gmaps'
                                value={newUser.gmaps}
                                onChange={handleInputChange}
                                className='w-full px-3 py-2 border rounded-lg text-black'
                            />
                        </div>
                        <div className='flex justify-end'>
                            <button
                                className='bg-gray-500 text-white px-4 py-2 rounded-lg mr-2'
                                onClick={handleModalClose}
                            >
                                Cancel
                            </button>
                            <button
                                className='bg-blue-500 text-white px-4 py-2 rounded-lg'
                                onClick={handleSubmitNewUser}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default UsersTable;