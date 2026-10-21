import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/permissions';
import { User, Shield, Building, Mail, Phone, Lock, Save, KeyRound, CheckCircle2, MapPin, Warehouse, BadgeCheck } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { toast } from 'sonner';

export const ProfileView = () => {
  const { user, role, organization, branch, warehouse, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+971 50 123 4567');
  const [selectedBranch, setSelectedBranch] = useState(branch || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouse || '');
  const [bio, setBio] = useState(user?.bio || 'Operations & Store Administrator');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '+971 50 123 4567');
      setSelectedBranch(user.branch || '');
      setSelectedWarehouse(user.warehouse || '');
      setBio(user.bio || 'Operations & Store Administrator');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (!email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    try { await updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    });

    toast.success('Profile updated successfully!'); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to save profile.'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try { await authApi.changePassword({ currentPassword, newPassword });
    toast.success('Password changed. Please sign in again.');
    window.dispatchEvent(new Event('auth:unauthorized'));
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword(''); } catch (err) { toast.error(err.response?.data?.detail || 'Unable to change password.'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Profile & Security Settings"
        subtitle="Manage personal information, store assignment, and security credentials"
      />

      {/* Main Profile Card Header */}
      <div className="erp-panel  p-6    flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-soft)] flex items-center justify-center text-[var(--sidebar)] font-bold text-2xl shadow-md shrink-0">
            {name?.[0] || 'A'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            <p className="text-xs text-gray-500 font-medium">{email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-[var(--primary)] border border-amber-200">
                <Shield className="w-3.5 h-3.5 mr-1" />
                {ROLE_LABELS[role] || role}
              </span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <BadgeCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Authenticated Session
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs space-y-1 text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200 self-start md:self-auto">
          <div className="flex items-center space-x-1.5">
            <Building className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-bold text-gray-800">{organization}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            <span>Branch: <strong className="text-gray-800">{selectedBranch}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Warehouse className="w-3.5 h-3.5 text-gray-500" />
            <span>Warehouse: <strong className="text-gray-800">{selectedWarehouse}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 space-x-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-1.5 border-b-2 ${
            activeTab === 'profile'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Edit Profile Details</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center space-x-1.5 border-b-2 ${
            activeTab === 'security'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB 1: Edit Profile Details */}
      {activeTab === 'profile' && (
        <div className="erp-panel max-w-3xl  p-6   ">
          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-200 flex items-center space-x-2">
              <User className="w-4 h-4 text-[var(--primary)]" />
              <span>Personal & Location Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-medium"
                    placeholder="e.g. Abdul Owner Admin"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-medium"
                    placeholder="e.g. owner@aromartist.com"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-mono"
                    placeholder="+971 50 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Job Title / Bio</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  placeholder="e.g. Head of Operations"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Primary Branch Assignment</label>
                <select
                  disabled value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-medium bg-white"
                >
                  <option value={selectedBranch}>{selectedBranch || "Unassigned"}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Primary Warehouse Assignment</label>
                <select
                  disabled value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none font-medium bg-white"
                >
                  <option value={selectedWarehouse}>{selectedWarehouse || "Unassigned"}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="erp-panel max-w-xl  p-6   ">
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-200 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[var(--primary)]" />
              <span>Change Security Password</span>
            </h3>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                placeholder="Repeat new password"
              />
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-200">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[#252525] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
