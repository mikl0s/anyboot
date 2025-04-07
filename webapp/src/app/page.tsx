'use client';

import React from 'react';
import Link from 'next/link';
import { FaServer, FaShieldAlt, FaProjectDiagram, FaLaptop, FaHdd } from 'react-icons/fa';
import { useWizardStore } from '@/store/wizardStore';

export default function Home() {
  // System checks - would be derived from real checks in a production app
  const systemChecks = [
    { id: 'system', title: 'System Ready', icon: <FaServer />, status: 'ok', description: 'All system requirements have been met for installation' },
    { id: 'uefi', title: 'UEFI Support', icon: <FaShieldAlt />, status: 'ok', description: 'Your system is running in UEFI mode' },
    { id: 'network', title: 'Network', icon: <FaProjectDiagram />, status: 'ok', description: 'Connected and ready for downloads' },
  ];

  // Available drives (mock data)
  const availableDrives = [
    { id: 'drive1', name: 'USB Drive', size: '16 GB', type: 'External' },
    { id: 'drive2', name: 'System Drive', size: '512 GB', type: 'Internal SSD' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Main Panel */}
      <div className="mb-10 p-8 bg-[#1f2335] rounded-xl border border-[#292e42] shadow-lg">
        <h1 className="text-3xl font-bold mb-2 text-white">AnyBoot</h1>
        <p className="text-[#a9b1d6] mb-6">
          Bootable drive creation utility
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Start */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">Quick Start</h2>
            <div className="flex flex-col gap-3">
              <Link 
                href="/step2"
                className="flex items-center px-4 py-3 bg-[#24283b] hover:bg-[#292e42] rounded-lg border border-[#292e42] transition-colors">
                <div className="mr-3 p-2 rounded-lg bg-[#7aa2f7]/10 text-[#7aa2f7]">
                  <FaLaptop size={20} />
                </div>
                <div>
                  <span className="block text-white font-medium">New Configuration</span>
                  <span className="text-sm text-[#a9b1d6]">Create a new bootable drive from scratch</span>
                </div>
              </Link>
              
              <button 
                className="flex items-center px-4 py-3 bg-[#24283b] hover:bg-[#292e42] rounded-lg border border-[#292e42] transition-colors">
                <div className="mr-3 p-2 rounded-lg bg-[#bb9af7]/10 text-[#bb9af7]">
                  <FaHdd size={20} />
                </div>
                <div>
                  <span className="block text-white font-medium">Load Configuration</span>
                  <span className="text-sm text-[#a9b1d6]">Continue from a saved configuration</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* System Status */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">System Status</h2>
            <div className="space-y-3">
              {systemChecks.map(check => (
                <div key={check.id} className="flex items-start py-2 border-b border-[#292e42]">
                  <div className={`p-2 mr-3 rounded-lg ${check.status === 'ok' ? 'bg-[#9ece6a]/10 text-[#9ece6a]' : 'bg-[#f7768e]/10 text-[#f7768e]'}`}>
                    {check.icon}
                  </div>
                  <div>
                    <h3 className="text-[#c0caf5] font-medium">{check.title}</h3>
                    <p className="text-sm text-[#a9b1d6]">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Device Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Available Drives */}
        <div className="md:col-span-2 bg-[#1f2335] p-6 rounded-xl border border-[#292e42]">
          <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">Available Drives</h2>
          <div className="space-y-3">
            {availableDrives.map(drive => (
              <div key={drive.id} className="flex justify-between items-center p-3 bg-[#24283b] rounded-lg border border-[#292e42] hover:border-[#3d59a1] transition-colors">
                <div className="flex items-center">
                  <div className="p-2 mr-3 rounded-lg bg-[#7aa2f7]/10 text-[#7aa2f7]">
                    <FaHdd />
                  </div>
                  <div>
                    <h3 className="text-[#c0caf5] font-medium">{drive.name}</h3>
                    <p className="text-xs text-[#a9b1d6]">{drive.type}</p>
                  </div>
                </div>
                <span className="text-[#a9b1d6]">{drive.size}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-[#1f2335] p-6 rounded-xl border border-[#292e42]">
          <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">Recent Activity</h2>
          <div className="text-center py-8 text-[#565f89]">
            <p>No recent activities</p>
          </div>
        </div>
      </div>
      
      {/* Features Panel - Condensed Version */}
      <div className="bg-[#1f2335] p-6 rounded-xl border border-[#292e42] mb-10">
        <h2 className="text-xl font-semibold mb-4 text-[#c0caf5]">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start">
            <div className="p-2 mr-3 rounded-lg bg-[#7aa2f7]/10 text-[#7aa2f7]">
              <FaServer />
            </div>
            <div>
              <h3 className="text-[#c0caf5] font-medium">Multi-Boot Support</h3>
              <p className="text-sm text-[#a9b1d6]">Install multiple operating systems on a single drive</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="p-2 mr-3 rounded-lg bg-[#bb9af7]/10 text-[#bb9af7]">
              <FaProjectDiagram />
            </div>
            <div>
              <h3 className="text-[#c0caf5] font-medium">Advanced Partitioning</h3>
              <p className="text-sm text-[#a9b1d6]">Create and manage disk partitions visually</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
