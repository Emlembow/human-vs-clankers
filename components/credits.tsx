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
        aria-label="Resource credits and licenses"
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
        <div className="credits-records">
          <a
            href="/assets/licenses/SOURCES.md"
            target="_blank"
            rel="noreferrer"
          >
            Source notes
          </a>
          <a
            href="/assets/licenses/manifest.json"
            target="_blank"
            rel="noreferrer"
          >
            Artwork file manifest
          </a>
          <a
            href="/assets/licenses/font-manifest.json"
            target="_blank"
            rel="noreferrer"
          >
            Font file manifest
          </a>
          <a
            href="/assets/licenses/credits.json"
            target="_blank"
            rel="noreferrer"
          >
            Complete credit index
          </a>
        </div>
      </section>
    </details>
  );
}
