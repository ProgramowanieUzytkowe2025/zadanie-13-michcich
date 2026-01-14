import { useState, useEffect } from 'react';

function SzczegolyWaluty() {
  const [historia, setHistoria] = useState(null);
  const [waluta, setWaluta] = useState('');
  const [blad, setBlad] = useState(null);

  useEffect(() => {
    const pobierzDane = () => {
      const hash = window.location.hash;
      const kod = hash.split('/')[1];
      
      if (kod) {
        setWaluta(kod.toUpperCase());
        setBlad(null);
        setHistoria(null);
        
        fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${kod}/last/30/?format=json`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Nie udało się pobrać danych');
            }
            return response.json();
          })
          .then(data => {
            setHistoria(data);
          })
          .catch(error => {
            console.error('Błąd:', error);
            setBlad('Nie udało się pobrać danych dla tej waluty');
          });
      }
    };

    pobierzDane();
    window.addEventListener('hashchange', pobierzDane);
    
    return () => window.removeEventListener('hashchange', pobierzDane);
  }, []);

  if (blad) {
    return (
      <div>
        <h2>Szczegóły waluty</h2>
        <p style={{ color: 'red' }}>{blad}</p>
        <button onClick={() => window.location.hash = 'waluty'}>Powrót do walut</button>
      </div>
    );
  }

  if (!historia) {
    return <div><h2>Ładowanie...</h2></div>;
  }

  const maxKurs = Math.max(...historia.rates.map(r => r.mid));
  const minKurs = Math.min(...historia.rates.map(r => r.mid));
  const roznica = maxKurs - minKurs;

  return (
    <div>
      <h2>Szczegóły waluty</h2>
      <p><strong>Waluta:</strong> {historia.currency}</p>
      <p><strong>Kod:</strong> {historia.code}</p>
      
      <h3>Historia kursu z ostatnich 30 dni</h3>
      <div style={{
        width: '100%',
        height: '300px',
        border: '1px solid #ddd',
        position: 'relative',
        marginTop: '20px',
        padding: '10px'
      }}>
        <svg width="100%" height="280" viewBox="0 0 800 280">
          <polyline
            fill="none"
            stroke="blue"
            strokeWidth="2"
            points={historia.rates.map((r, i) => {
              const x = (i / (historia.rates.length - 1)) * 780 + 10;
              const y = 270 - ((r.mid - minKurs) / roznica) * 250;
              return `${x},${y}`;
            }).join(' ')}
          />
          {historia.rates.map((r, i) => {
            const x = (i / (historia.rates.length - 1)) * 780 + 10;
            const y = 270 - ((r.mid - minKurs) / roznica) * 250;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="blue"
              />
            );
          })}
        </svg>
      </div>
      
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '30px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Data</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Kurs (PLN)</th>
          </tr>
        </thead>
        <tbody>
          {historia.rates.map((r, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{r.effectiveDate}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{r.mid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Waluty() {
  const [kurs, setKurs] = useState(null);
  const [waluta, setWaluta] = useState('usd');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [blad, setBlad] = useState(null);
  const [waluty, setWaluty] = useState([]);

  useEffect(() => {
    fetch('https://api.nbp.pl/api/exchangerates/tables/a/?format=json')
      .then(response => response.json())
      .then(data => {
        const listaWalut = data[0].rates.map(r => ({
          kod: r.code.toLowerCase(),
          nazwa: r.currency
        }));
        setWaluty(listaWalut);
      })
      .catch(error => console.error('Błąd:', error));
  }, []);

  useEffect(() => {
    if (waluty.length > 0) {
      pobierzKurs(waluta, data);
    }
  }, [waluty]);

  const pobierzKurs = (kod, dataKursu) => {
    setBlad(null);
    fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${kod}/${dataKursu}/?format=json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Brak danych');
        }
        return response.json();
      })
      .then(data => {
        setKurs(data);
      })
      .catch(error => {
        const d = new Date(dataKursu);
        d.setDate(d.getDate() - 1);
        const nowaData = d.toISOString().split('T')[0];
        
        if (nowaData < '2002-01-02') {
          setBlad('Nie można znaleźć kursu');
          setKurs(null);
          return;
        }
        
        pobierzKurs(kod, nowaData);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    pobierzKurs(waluta, data);
  };

  return (
    <div>
      <h2>Tabela kursów walut</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Waluta: 
            <select 
              value={waluta}
              onChange={(e) => setWaluta(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              {waluty.map(w => (
                <option key={w.kod} value={w.kod}>{w.nazwa} ({w.kod.toUpperCase()})</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Data: 
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        <button type="submit" style={{ padding: '5px 15px', marginRight: '10px' }}>Pokaż kurs</button>
        <button 
          type="button"
          onClick={() => window.location.hash = `waluty/${waluta}`}
          style={{ padding: '5px 15px' }}
        >
          Przejdź
        </button>
      </form>
      
      {blad && <p style={{ color: 'red' }}>{blad}</p>}
      
      {kurs && (
        <div>
          <p><strong>Waluta:</strong> {kurs.currency}</p>
          <p><strong>Kod:</strong> {kurs.code}</p>
          <p><strong>Data:</strong> {kurs.rates[0].effectiveDate}</p>
          <p><strong>Kurs:</strong> {kurs.rates[0].mid} PLN</p>
        </div>
      )}
      
      {!kurs && !blad && <p>Ładowanie...</p>}
    </div>
  );
}

function CenaZlota() {
  const [zloto, setZloto] = useState(null);
  const [liczba, setLiczba] = useState(10);
  const [inputValue, setInputValue] = useState(10);

  useEffect(() => {
    fetch(`https://api.nbp.pl/api/cenyzlota/last/${liczba}/?format=json`)
      .then(response => response.json())
      .then(data => {
        setZloto(data);
      })
      .catch(error => console.error('Błąd:', error));
  }, [liczba]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLiczba(inputValue);
  };

  if (!zloto) {
    return <div><h2>Ładowanie...</h2></div>;
  }

  return (
    <div>
      <h2>Aktualna cena złota</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <label>
          Liczba notowań: 
          <input 
            type="number" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            min="1"
            style={{ marginLeft: '10px', marginRight: '10px', padding: '5px' }}
          />
        </label>
        <button type="submit" style={{ padding: '5px 15px' }}>Pokaż</button>
      </form>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Data</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Cena (PLN)</th>
          </tr>
        </thead>
        <tbody>
          {zloto.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.data}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.cena} PLN</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Autor() {
  return (
    <div>
      <h2>Informacje o autorze</h2>
      <p>Michał Cichosz</p>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('waluty');

  useEffect(() => {
    const hash = window.location.hash.slice(1) || 'waluty';
    setCurrentPage(hash);

    const handleHashChange = () => {
      setCurrentPage(window.location.hash.slice(1) || 'waluty');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    if (currentPage.startsWith('waluty/')) {
      return <SzczegolyWaluty />;
    }
    
    switch(currentPage) {
      case 'waluty':
        return <Waluty />;
      case 'cena-zlota':
        return <CenaZlota />;
      case 'autor':
        return <Autor />;
      default:
        return <Waluty />;
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <nav style={{
        backgroundColor: '#333',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <ul style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          gap: '20px'
        }}>
          <li>
            <a href="#waluty" style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 15px',
              display: 'block'
            }}>
              Waluty
            </a>
          </li>
          <li>
            <a href="#cena-zlota" style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 15px',
              display: 'block'
            }}>
              Cena złota
            </a>
          </li>
          <li>
            <a href="#autor" style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 15px',
              display: 'block'
            }}>
              Autor
            </a>
          </li>
        </ul>
      </nav>

      <div style={{ padding: '0 20px' }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;