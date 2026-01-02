import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Build Rich Dashboards',
    description: (
      <>
        Combine gauges, labels, progress bars, and more to visualize the Homey
        metrics that matter in a single glance.
      </>
    ),
  },
  {
    title: 'Automate with Flows',
    description: (
      <>
        Use DataVista action cards to push live values, configure widgets, and
        react to Homey events without manual updates.
      </>
    ),
  },
  {
    title: 'Tailor Every Detail',
    description: (
      <>
        Adjust colors, styles, refresh behavior, and icons so each widget fits
        your dashboard design and use case.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
