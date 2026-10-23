// Decoration only: one soft gradient half off the screen + at most two assets per screen.
const A = (name) => `/assets/${name}.webp`

const Glow = ({ pos = 'right' }) => (
  <div className={`glow glow-${pos}`}>
    <img src={A('glow')} alt="" />
  </div>
)

const Piece = ({ name, i = 0, children }) => (
  <div className={`piece p-${name}`} style={{ '--i': i }}>
    {children}
  </div>
)

export default function Art({ kind, n }) {
  return (
    <div className={`art art-${kind}`} aria-hidden="true">
      {kind === 'intro' && (
        <>
          <Glow />
          <Piece name="man" i={0}>
            <img src={A('phone-man')} alt="" />
          </Piece>
          <Piece name="corner-rings" i={1}>
            <img className="float" src={A('rings')} alt="" />
          </Piece>
        </>
      )}

      {kind === 'rules' && (
        <>
          <Glow pos="bottom" />
          <Piece name="corner-ring" i={0}>
            <img className="float" src={A('ring')} alt="" />
          </Piece>
        </>
      )}

      {(kind === 'choice' || kind === 'result') && (
        <>
          <Glow />
          <Piece name="rings" i={0}>
            <img className="float-slow" src={A('rings')} alt="" />
          </Piece>
        </>
      )}

      {kind === 'question' && (
        <>
          <Glow />
          <Piece name="number" i={0}>
            <div className="number float-slow">
              <img src={A('ring')} alt="" />
              <span className="grad">{String(n).padStart(2, '0')}</span>
            </div>
          </Piece>
        </>
      )}

      {kind === 'call' && (
        <>
          <Glow />
          <Piece name="bust" i={0}>
            <img src={A('bust')} alt="" />
          </Piece>
        </>
      )}
    </div>
  )
}
