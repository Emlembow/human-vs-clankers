'use client';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Native details contains game hotkeys without cancelling its default controls; the labelled scrollable section is keyboard-focusable for scrolling. */

import type { SyntheticEvent } from 'react';
import credits from '../public/assets/licenses/credits.json';

export type CreditEntry = {
  id: string;
  title: string;
  creator: string;
  sourceUrl?: string;
  use: string;
  changes?: string;
  files?: string[];
  license: { name: string; url: string } | null;
  links?: { label: string; url: string }[];
};
export type CreditGroup = { id: string; title: string; entries: CreditEntry[] };
export const CREDIT_GROUPS: CreditGroup[] = credits.groups;

const keepInputInCredits = (event: SyntheticEvent) => event.stopPropagation();

export function Credits({
  onToggle,
}: {
  onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => void;
}) {
  return (
    <details
      className="game-credits"
      onToggle={onToggle}
      onKeyDown={keepInputInCredits}
      onKeyUp={keepInputInCredits}
      onPointerDown={keepInputInCredits}
      onPointerUp={keepInputInCredits}
    >
      <summary>Credits</summary>
      <section
        className="credits-content"
        aria-label="Creative Commons artwork credits"
        tabIndex={0}
      >
        {CREDIT_GROUPS.map((group) => (
          <section className="credit-group" key={group.id}>
            <h2>{group.title}</h2>
            <ul>
              {group.entries.map((entry) => (
                <li key={entry.id} data-credit-id={entry.id}>
                  <h3>
                    {entry.sourceUrl ? (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {entry.title}
                      </a>
                    ) : (
                      entry.title
                    )}
                  </h3>
                  <p className="credit-creator">{entry.creator}</p>
                  <p>{entry.use}</p>
                  {entry.changes && <p>{entry.changes}</p>}
                  {(entry.license || entry.links?.length) && (
                    <div className="credit-links">
                      {entry.license && (
                        <a
                          href={entry.license.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {entry.license.name}
                        </a>
                      )}
                      {entry.links?.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </details>
  );
}
