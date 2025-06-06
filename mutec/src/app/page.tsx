import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl">
          Welcome to Mutec
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          An intuitive, canvas-based chat interface for exploring conversations with large language models. Create, connect, and branch your ideas visually.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/workspace"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get Started
          </Link>
          <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Learn more <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
