import Link from 'next/link';
import { FaFolderOpen, FaCog, FaQuestionCircle } from 'react-icons/fa';

const Header = () => {
  return (
    <header className="bg-[#1f2335] border-b border-[#292e42] py-4 px-6 fixed w-full z-10">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-white hover:text-[#7aa2f7] transition-colors">
          AnyBoot
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="/" className="text-[#a9b1d6] hover:text-white p-2 transition-colors">
            <FaFolderOpen className="inline mr-1" /> Templates
          </Link>
          <Link href="/" className="text-[#a9b1d6] hover:text-white p-2 transition-colors">
            <FaCog className="inline mr-1" /> Settings
          </Link>
          <Link href="/" className="text-[#a9b1d6] hover:text-white p-2 transition-colors">
            <FaQuestionCircle className="inline mr-1" /> Help
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
