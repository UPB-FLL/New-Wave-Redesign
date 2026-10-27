import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IT_PAGE_META } from '../../lib/routeMeta';
import { PageHeader } from '../brand/PageHeader';

const credentials = ['HIPAA readiness', 'PCI-DSS readiness', 'SOC 2 audit prep', 'ISO 27001 alignment'];

export default function CybersecurityHero() {
  return (
    <PageHeader
      breadcrumbs={IT_PAGE_META['/cybersecurity'].breadcrumbs}
      title="Enterprise security without the enterprise headache."
      description="Stop threats before they reach your business. New Wave IT combines around-the-clock security operations, threat detection, and experienced analysts in a program built for practical business needs."
      actions={
        <>
          <Link to="/contact" className="btn-primary">
            Get a security assessment
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <a href="#services" className="btn-ghost-dark">Explore solutions</a>
        </>
      }
      facts={credentials}
    />
  );
}
