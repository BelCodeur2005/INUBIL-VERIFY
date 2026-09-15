import { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SearchableSelect.module.css';

function normaliser(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Select avec recherche au clavier — API proche d'un <select> contrôlé :
 * `options` = [{ value, label }], `value`/`onChange` pilotent la sélection.
 * Le texte tapé filtre les options par sous-chaîne (insensible à la casse et
 * aux accents) ; Entrée valide l'option surlignée, Échap ferme sans modifier
 * la sélection. Pas de saisie libre : le champ revient toujours à l'option
 * sélectionnée (ou au placeholder) à la fermeture.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Choisir…',
  disabled = false,
  className = '',
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState('');
  const [surligne, setSurligne] = useState(0);
  const inputRef = useRef(null);

  const optionSelectionnee = options.find((o) => o.value === value) ?? null;

  const optionsFiltrees = useMemo(() => {
    const q = normaliser(requete);
    if (!q) return options;
    return options.filter((o) => normaliser(o.label).includes(q));
  }, [options, requete]);

  const choisir = (option) => {
    onChange(option.value);
    setOuvert(false);
    setRequete('');
  };

  const fermer = () => {
    setOuvert(false);
    setRequete('');
  };

  const gererClavier = (e) => {
    if (!ouvert) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setOuvert(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSurligne((i) => Math.min(i + 1, optionsFiltrees.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSurligne((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (optionsFiltrees[surligne]) choisir(optionsFiltrees[surligne]);
    } else if (e.key === 'Escape') {
      fermer();
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`${styles.racine} ${className}`}>
      <div className={styles.champWrap}>
        <input
          ref={inputRef}
          type="text"
          className={styles.champ}
          role="combobox"
          aria-expanded={ouvert}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={ouvert ? requete : (optionSelectionnee?.label ?? '')}
          onFocus={() => { setOuvert(true); setRequete(''); setSurligne(0); }}
          onChange={(e) => { setRequete(e.target.value); setSurligne(0); }}
          onBlur={fermer}
          onKeyDown={gererClavier}
        />
        <ChevronDown size={15} className={styles.chevron} />
      </div>
      {ouvert && (
        <ul className={styles.liste} role="listbox">
          {optionsFiltrees.length === 0 && (
            <li className={styles.vide}>Aucun résultat</li>
          )}
          {optionsFiltrees.map((o, i) => (
            <li
              key={o.value || '__vide__'}
              role="option"
              aria-selected={o.value === value}
              className={`${styles.option} ${i === surligne ? styles.optionSurlignee : ''} ${o.value === value ? styles.optionSelectionnee : ''}`}
              onMouseDown={(e) => { e.preventDefault(); choisir(o); }}
              onMouseEnter={() => setSurligne(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
