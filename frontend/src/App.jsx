import React, { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import routes from './routes';
import Layout from './components/layout/Layout';
import Loader from './components/common/Loader';

const App = () => {
  const { loading } = useAuth();
  const routing = useRoutes(routes);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Layout>
      <Suspense
        fallback={(
          <div className="w-full py-24 flex items-center justify-center">
            <Loader size="lg" />
          </div>
        )}
      >
        {routing}
      </Suspense>
    </Layout>
  );
};

export default App;
