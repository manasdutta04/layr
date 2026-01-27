export interface PlanTemplate {
    id: string;
    name: string;
    category: 'Web' | 'Backend' | 'Mobile' | 'Data' | 'DevOps' | 'Desktop';
    description: string;
    content: string; // The actual plan requirements
}

export const BUILTIN_TEMPLATES: PlanTemplate[] = [
    {
        id: 'react-spa',
        name: 'Modern React SPA',
        category: 'Web',
        description: 'A Single Page Application using React, Vite, and Tailwind CSS.',
        content: `Project Type: Web Application
Tech Stack: React, Vite, Tailwind CSS, React Router
Features:
- Responsive UI with Tailwind
- Client-side routing
- State management (Context API/Zustand)
- API integration setup
- Unit testing with Vitest`
    },
    {
        id: 'node-express-api',
        name: 'REST API with Express',
        category: 'Backend',
        description: 'Production-ready REST API with Node.js, Express, and TypeScript.',
        content: `Project Type: Backend API
Tech Stack: Node.js, Express, TypeScript, MongoDB/PostgreSQL
Features:
- Authentication (JWT)
- Request validation (Zod)
- Error handling middleware
- Swagger documentation
- Docker support`
    },
    {
        id: 'flutter-mobile',
        name: 'Flutter Mobile App',
        category: 'Mobile',
        description: 'Cross-platform mobile application using Flutter.',
        content: `Project Type: Mobile App
Tech Stack: Flutter, Dart, Riverpod
Features:
- Material Design UI
- State management with Riverpod
- API integration (Dio)
- Local storage (Shared Preferences)
- Navigation (GoRouter)`
    },
    {
        id: 'python-data-pipeline',
        name: 'Python ETL Pipeline',
        category: 'Data',
        description: 'Data processing pipeline using Pandas and Airflow.',
        content: `Project Type: Data Engineering
Tech Stack: Python, Pandas, Apache Airflow
Features:
- Data extraction scripts
- Transformation logic with Pandas
- Loading into Data Warehouse
- Error logging and monitoring
- Automated scheduling`
    },
    {
        id: 'electron-desktop',
        name: 'Electron Desktop App',
        category: 'Desktop',
        description: 'Cross-platform desktop app with Electron and React.',
        content: `Project Type: Desktop Application
Tech Stack: Electron, React, TypeScript
Features:
- Native OS integration (Menus, Tray)
- IPC communication
- File system access
- Auto-updater setup`
    }
];