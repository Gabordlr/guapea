import { BasicStepLoader } from "../components/loaders/BasicStepLoader";
import { RuedaLoader } from "../components/loaders/RuedaLoader";
import { SalsaLoader } from "../components/loaders/SalsaLoader";

/** Dev/preview page — both loaders kept; app uses rueda via SalsaLoader. */
export function LoadersPage() {
  return (
    <div className="stack loaders-page">
      <div>
        <h1 className="page-title">Loaders</h1>
        <p className="page-sub">
          Vista de prueba. En la app, <code>SalsaLoader</code> usa la rueda.
        </p>
      </div>

      <section className="loaders-grid">
        <figure className="loader-card">
          <figcaption>Basic step (guardado)</figcaption>
          <BasicStepLoader />
        </figure>

        <figure className="loader-card">
          <figcaption>Rueda (en uso)</figcaption>
          <RuedaLoader />
        </figure>
      </section>

      <section className="loader-card">
        <figcaption>Como en la app</figcaption>
        <SalsaLoader />
      </section>
    </div>
  );
}
